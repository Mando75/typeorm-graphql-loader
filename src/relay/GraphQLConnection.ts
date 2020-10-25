import { GraphQLConnectionEdge } from "./GraphQLConnectionEdge";

interface PageInfo {}

export class GraphQLConnection<T> {
  public pageInfo: PageInfo;

  constructor(public edges: GraphQLConnectionEdge<T>[]) {
    this.pageInfo = {};
  }
}
