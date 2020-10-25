export class GraphQLConnectionEdge<T> {
  constructor(public node: T, public cursor: string) {}
}
