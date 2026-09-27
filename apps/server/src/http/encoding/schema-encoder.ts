import { Either, Option, ParseResult, Schema, SchemaAST } from "effect";

const MISMATCH = Symbol("mismatch");
const UNSUPPORTED = Symbol("unsupported");

type Step = (input: unknown) => unknown;
type Fields = Record<PropertyKey, unknown>;

const failed = (value: unknown) => value === MISMATCH || value === UNSUPPORTED;

const unsupported: Step = () => UNSUPPORTED;

const settled = (result: unknown) =>
  Either.isEither(result)
    ? Either.getOrElse(result, () => MISMATCH)
    : UNSUPPORTED;

const when =
  (accepts: (input: unknown) => boolean): Step =>
  (input) =>
    accepts(input) ? input : MISMATCH;

const isObject = (input: unknown): input is Fields =>
  typeof input === "object" && input !== null && !Array.isArray(input);

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

const struct = (ast: SchemaAST.TypeLiteral): Step => {
  const fields = ast.propertySignatures.map(
    (field) => [field.name, field.isOptional, build(field.type)] as const
  );
  return (input) => {
    if (!isObject(input)) {
      return MISMATCH;
    }
    const output: Fields = {};
    for (const [name, optional, step] of fields) {
      if (optional && !Object.hasOwn(input, name)) {
        continue;
      }
      const value = step(input[name]);
      if (failed(value)) {
        return value;
      }
      output[name] = value;
    }
    return output;
  };
};

const record =
  (item: Step): Step =>
  (input) => {
    if (!isObject(input)) {
      return MISMATCH;
    }
    const output: Fields = {};
    for (const key of Object.keys(input)) {
      const value = item(input[key]);
      if (failed(value)) {
        return value;
      }
      output[key] = value;
    }
    return output;
  };

const typeLiteral = (ast: SchemaAST.TypeLiteral): Step => {
  const [index, ...more] = ast.indexSignatures;
  if (index === undefined) {
    return ast.propertySignatures.length === 0 ? unsupported : struct(ast);
  }
  return more.length === 0 &&
    ast.propertySignatures.length === 0 &&
    index.parameter._tag === "StringKeyword"
    ? record(build(index.type))
    : unsupported;
};

const literalsOf = (ast: SchemaAST.AST) =>
  new Map(
    SchemaAST.getPropertySignatures(SchemaAST.typeAST(ast)).flatMap((field) =>
      !field.isOptional && field.type._tag === "Literal"
        ? [[field.name, field.type.literal] as const]
        : []
    )
  );

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
  const members = ast.types.map(build);
  const literals = ast.types.map(literalsOf);
  const key = [...(literals[0]?.keys() ?? [])].find((name) =>
    literals.every((fields) => fields.has(name))
  );
  if (key === undefined) {
    return (input) => firstOnlyMatch(members, input);
  }
  const byLiteral = new Map<unknown, Step[]>();
  members.forEach((member, index) => {
    const literal = literals[index]?.get(key);
    byLiteral.set(literal, [...(byLiteral.get(literal) ?? []), member]);
  });
  return (input) =>
    isObject(input)
      ? firstOnlyMatch(byLiteral.get(input[key]) ?? [], input)
      : MISMATCH;
};

const refinement = (ast: SchemaAST.Refinement): Step => {
  const from = build(ast.from);
  const type = SchemaAST.typeAST(ast.from);
  const validate = ParseResult.validateEither(Schema.make(type));
  const typed =
    type === ast.from
      ? (_input: unknown, encoded: unknown) => encoded
      : (input: unknown) => Either.getOrElse(validate(input), () => MISMATCH);
  return (input) => {
    const value = from(input);
    if (failed(value)) {
      return value;
    }
    const checked = typed(input, value);
    return checked !== MISMATCH &&
      Option.isNone(ast.filter(checked, SchemaAST.defaultParseOption, ast))
      ? value
      : MISMATCH;
  };
};

const renamed = (
  transformation: SchemaAST.TypeLiteralTransformation,
  typed: unknown
) => {
  const output: Fields = { ...(typed as Fields) };
  for (const field of transformation.propertySignatureTransformations) {
    const value = field.encode(
      Object.hasOwn(output, field.to)
        ? Option.some(output[field.to])
        : Option.none()
    );
    delete output[field.to];
    if (Option.isSome(value)) {
      output[field.from] = value.value;
    }
  }
  return output;
};

const encoderOf = (ast: SchemaAST.Transformation) => {
  const change = ast.transformation;
  switch (change._tag) {
    case "FinalTransformation":
      return (typed: unknown, input: unknown) =>
        settled(change.encode(typed, SchemaAST.defaultParseOption, ast, input));
    case "TypeLiteralTransformation":
      return (typed: unknown) => renamed(change, typed);
    default:
      return;
  }
};

const transformation = (ast: SchemaAST.Transformation): Step => {
  const encode = encoderOf(ast);
  if (encode === undefined) {
    return unsupported;
  }
  const to = build(ast.to);
  const from = build(ast.from);
  return (input) => {
    const typed = to(input);
    if (failed(typed)) {
      return typed;
    }
    const encoded = encode(typed, input);
    return failed(encoded) ? encoded : from(encoded);
  };
};

const declaration = (ast: SchemaAST.Declaration): Step => {
  if (ast.typeParameters.length > 0) {
    return unsupported;
  }
  const encode = ast.encodeUnknown();
  return (input) => settled(encode(input, SchemaAST.defaultParseOption, ast));
};

const build = (ast: SchemaAST.AST): Step => {
  if (Option.isSome(SchemaAST.getParseOptionsAnnotation(ast))) {
    return unsupported;
  }
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
    case "VoidKeyword":
      return (input) => input;
    case "TupleType":
      return ast.elements.length === 0 && ast.rest.length === 1
        ? array(build((ast.rest[0] as SchemaAST.Type).type))
        : unsupported;
    case "TypeLiteral":
      return typeLiteral(ast);
    case "Union":
      return union(ast);
    case "Refinement":
      return refinement(ast);
    case "Transformation":
      return transformation(ast);
    case "Declaration":
      return declaration(ast);
    default:
      return unsupported;
  }
};

export const schemaEncoder = <A, I, R>(schema: Schema.Schema<A, I, R>) => {
  const step = build(schema.ast);
  return (value: A): Option.Option<I> => {
    const encoded = step(value);
    return failed(encoded) ? Option.none() : Option.some(encoded as I);
  };
};
