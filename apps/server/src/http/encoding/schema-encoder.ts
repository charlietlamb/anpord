import { Either, Option, type Schema, SchemaAST } from "effect";

const MISMATCH = Symbol("mismatch");
const UNSUPPORTED = Symbol("unsupported");

type Step = (input: unknown) => unknown;
type Fields = Record<PropertyKey, unknown>;

const failed = (value: unknown) => value === MISMATCH || value === UNSUPPORTED;

const owns = (input: object, key: PropertyKey) => Object.hasOwn(input, key);

const settled = (result: unknown) => {
  if (!Either.isEither(result)) {
    return UNSUPPORTED;
  }
  return Either.isRight(result) ? result.right : MISMATCH;
};

const when =
  (accepts: (input: unknown) => boolean): Step =>
  (input) =>
    accepts(input) ? input : MISMATCH;

const steps = new WeakMap<SchemaAST.AST, Step>();

const stepOf = (ast: SchemaAST.AST): Step => {
  const known = steps.get(ast);
  if (known !== undefined) {
    return known;
  }
  let built: Step = () => UNSUPPORTED;
  steps.set(ast, (input) => built(input));
  built = Option.isSome(SchemaAST.getParseOptionsAnnotation(ast))
    ? () => UNSUPPORTED
    : build(ast);
  steps.set(ast, built);
  return built;
};

const array =
  (item: Step): Step =>
  (input) => {
    if (!Array.isArray(input)) {
      return MISMATCH;
    }
    const output = new Array<unknown>(input.length);
    for (let index = 0; index < input.length; index++) {
      const value = item(input[index]);
      if (failed(value)) {
        return value;
      }
      output[index] = value;
    }
    return output;
  };

const record = (ast: SchemaAST.TypeLiteral): Step => {
  if (
    ast.indexSignatures.some(
      (signature) => signature.parameter._tag !== "StringKeyword"
    )
  ) {
    return () => UNSUPPORTED;
  }
  const fields = ast.propertySignatures.map(
    (field) => [field.name, field.isOptional, stepOf(field.type)] as const
  );
  const declared = new Set<PropertyKey>(fields.map(([name]) => name));
  const indexes = ast.indexSignatures.map((signature) =>
    stepOf(signature.type)
  );

  const named = (source: Fields, output: Fields) => {
    for (const [name, optional, step] of fields) {
      if (optional && !owns(source, name)) {
        continue;
      }
      const value = step(source[name]);
      if (failed(value)) {
        return value;
      }
      output[name] = value;
    }
    return output;
  };

  const indexed = (source: Fields, output: Fields) => {
    for (const step of indexes) {
      for (const key of Object.keys(source)) {
        const value = step(source[key]);
        if (failed(value)) {
          return value;
        }
        if (!declared.has(key)) {
          output[key] = value;
        }
      }
    }
    return output;
  };

  return (input) => {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return MISMATCH;
    }
    const output = named(input as Fields, {});
    return failed(output) ? output : indexed(input as Fields, output as Fields);
  };
};

const NO_LITERAL = Symbol("no literal");

const literalOf = (ast: SchemaAST.AST, key: PropertyKey): unknown => {
  switch (ast._tag) {
    case "TypeLiteral": {
      const field = ast.propertySignatures.find(
        (candidate) => candidate.name === key && !candidate.isOptional
      );
      const type =
        field === undefined ? undefined : SchemaAST.typeAST(field.type);
      return type?._tag === "Literal" ? type.literal : NO_LITERAL;
    }
    case "Transformation":
      return literalOf(ast.to, key);
    case "Refinement":
      return literalOf(ast.from, key);
    default:
      return NO_LITERAL;
  }
};

const keysOf = (ast: SchemaAST.AST): readonly PropertyKey[] => {
  switch (ast._tag) {
    case "TypeLiteral":
      return ast.propertySignatures.map((field) => field.name);
    case "Transformation":
      return keysOf(ast.to);
    case "Refinement":
      return keysOf(ast.from);
    default:
      return [];
  }
};

const discriminated = (types: readonly SchemaAST.AST[]) => {
  const key = keysOf(types[0] ?? SchemaAST.neverKeyword).find((candidate) =>
    types.every((type) => literalOf(type, candidate) !== NO_LITERAL)
  );
  if (key === undefined) {
    return;
  }
  const byLiteral = new Map<unknown, Step[]>();
  for (const type of types) {
    const literal = literalOf(type, key);
    byLiteral.set(literal, [...(byLiteral.get(literal) ?? []), stepOf(type)]);
  }
  return { byLiteral, key };
};

const firstOnlyMatch = (members: readonly Step[], input: unknown) => {
  let found: unknown = MISMATCH;
  for (const member of members) {
    const value = member(input);
    if (value === UNSUPPORTED || (value !== MISMATCH && found !== MISMATCH)) {
      return UNSUPPORTED;
    }
    if (value !== MISMATCH) {
      found = value;
    }
  }
  return found;
};

const union = (ast: SchemaAST.Union): Step => {
  const members = ast.types.map(stepOf);
  const tags = discriminated(ast.types);
  if (tags === undefined) {
    return (input) => firstOnlyMatch(members, input);
  }
  return (input) =>
    typeof input === "object" && input !== null
      ? firstOnlyMatch(
          tags.byLiteral.get((input as Fields)[tags.key]) ?? [],
          input
        )
      : MISMATCH;
};

const refinement = (ast: SchemaAST.Refinement): Step => {
  const from = stepOf(ast.from);
  return (input) => {
    const value = from(input);
    if (failed(value)) {
      return value;
    }
    return Option.isNone(ast.filter(input, SchemaAST.defaultParseOption, ast))
      ? value
      : MISMATCH;
  };
};

const renamed = (
  transformation: SchemaAST.TypeLiteralTransformation,
  encoded: Fields
) => {
  const output = { ...encoded };
  for (const field of transformation.propertySignatureTransformations) {
    const value = field.encode(
      owns(output, field.to) ? Option.some(output[field.to]) : Option.none()
    );
    delete output[field.to];
    if (Option.isSome(value)) {
      output[field.from] = value.value;
    }
  }
  return output;
};

const transformation = (ast: SchemaAST.Transformation): Step => {
  const to = stepOf(ast.to);
  const from = stepOf(ast.from);
  const change = ast.transformation;
  return (input) => {
    const typed = to(input);
    if (failed(typed)) {
      return typed;
    }
    switch (change._tag) {
      case "ComposeTransformation":
        return from(typed);
      case "TypeLiteralTransformation":
        return from(renamed(change, typed as Fields));
      case "FinalTransformation": {
        const encoded = settled(
          change.encode(typed, SchemaAST.defaultParseOption, ast, input)
        );
        return failed(encoded) ? encoded : from(encoded);
      }
      default:
        return UNSUPPORTED;
    }
  };
};

const declaration = (ast: SchemaAST.Declaration): Step => {
  const encode = ast.encodeUnknown(...ast.typeParameters);
  return (input) => settled(encode(input, SchemaAST.defaultParseOption, ast));
};

const build = (ast: SchemaAST.AST): Step => {
  switch (ast._tag) {
    case "StringKeyword":
      return when((input) => typeof input === "string");
    case "NumberKeyword":
      return when((input) => typeof input === "number");
    case "BooleanKeyword":
      return when((input) => typeof input === "boolean");
    case "UndefinedKeyword":
      return when((input) => input === undefined);
    case "Literal":
      return when((input) => input === ast.literal);
    case "UnknownKeyword":
    case "AnyKeyword":
    case "VoidKeyword":
      return (input) => input;
    case "TupleType":
      return ast.elements.length === 0 && ast.rest.length === 1
        ? array(stepOf((ast.rest[0] as SchemaAST.Type).type))
        : () => UNSUPPORTED;
    case "TypeLiteral":
      return record(ast);
    case "Union":
      return union(ast);
    case "Refinement":
      return refinement(ast);
    case "Transformation":
      return transformation(ast);
    case "Declaration":
      return declaration(ast);
    case "Suspend": {
      let inner: Step | undefined;
      return (input) => {
        inner ??= stepOf(ast.f());
        return inner(input);
      };
    }
    default:
      return () => UNSUPPORTED;
  }
};

export const schemaEncoder = <A, I, R>(schema: Schema.Schema<A, I, R>) => {
  const step = stepOf(schema.ast);
  return (value: A): Option.Option<I> => {
    const encoded = step(value);
    return failed(encoded) ? Option.none() : Option.some(encoded as I);
  };
};
