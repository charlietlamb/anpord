import { Context } from "effect";

export class Repeatable extends Context.Tag("@anpord/schema/public/Repeatable")<
  Repeatable,
  true
>() {}
