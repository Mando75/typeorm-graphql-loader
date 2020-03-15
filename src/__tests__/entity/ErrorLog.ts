import { Node } from "./Node";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { builder } from "../schema";
import { User } from "./User";
import { GraphQLID, GraphQLString, GraphQLResolveInfo } from "graphql";
import { GraphQLDatabaseLoader } from "../../";

@builder.type()
@Entity()
export class ErrorLog extends Node {
  @builder.nonNull()
  @builder.field(GraphQLID)
  @PrimaryGeneratedColumn()
  id!: number;

  @builder.field(GraphQLString)
  @Column()
  message!: string;

  @builder.field(GraphQLString)
  @Column()
  code!: string;

  @builder.field(() => User)
  @ManyToOne(type => User)
  user!: User;

  @builder.query({
    returnType: () => ErrorLog
  })
  async logWithoutInfo(
    _: any,
    __: any,
    context: { loader: GraphQLDatabaseLoader }
  ) {
    // this will fail
    return context.loader.loadEntity(ErrorLog).loadOne();
  }

  @builder.query({
    returnType: {
      type: () => ErrorLog,
      list: true
    }
  })
  async paginationWithoutOptions(
    _: any,
    __: any,
    context: { loader: GraphQLDatabaseLoader },
    info: GraphQLResolveInfo
  ) {
    return context.loader
      .loadEntity(ErrorLog)
      .info(info)
      .loadPaginated();
  }
}
