import { AuthorResolver } from "./AuthorResolver";
import { BookResolver } from "./BookResolver";
import { ReviewResolver } from "./ReviewResolver";
import { DecoratorTestResolver } from "./DecoratorTestResolver";

export default [
  AuthorResolver,
  BookResolver,
  ReviewResolver,
  DecoratorTestResolver
];
export { AuthorResolver, BookResolver, ReviewResolver, DecoratorTestResolver };
