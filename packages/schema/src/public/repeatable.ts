import { Context } from "effect";

export class Repeatable extends Context.Tag("@sphynx/schema/public/Repeatable")<
  Repeatable,
  true
>() {}
