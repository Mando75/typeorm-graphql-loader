import { GraphQLConnectionEdge } from "./GraphQLConnectionEdge";
import { PageInfo } from "../types";

export class GraphQLConnection<T> {
  public pageInfo: PageInfo;

  constructor(public edges: GraphQLConnectionEdge<T>[]) {
    this.pageInfo = {};
  }
}
