import { Node } from "./Node";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { builder } from "../schema";
import { User } from "./User";
import {
  GraphQLID,
  GraphQLBoolean,
  GraphQLString,
  GraphQLResolveInfo
} from "graphql";
import { GraphQLDatabaseLoader } from "../../";

/**
 * A helper entity to test all the various options
 * and stuff. Will probably clean this up at some point
 * For right now it works
 */
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

  @builder.field(GraphQLString)
  combinedCodeAndMessage() {
    return this.code + this.message;
  }

  @builder.query({
    returnType: () => ErrorLog,
    args: {
      useSelectFields: {
        type: GraphQLBoolean,
        defaultValue: true
      }
    }
  })
  async requiredSelectFields(
    _: any,
    { useSelectFields }: { useSelectFields: boolean },
    context: { loader: GraphQLDatabaseLoader },
    info: GraphQLResolveInfo
  ) {
    // If useSelectFields is not included, the fields will not be loaded
    // so we can test this returns null
    let loader = context.loader.loadEntity(ErrorLog).info(info);
    if (useSelectFields) {
      loader = loader.selectFields(["code", "message"]);
    }
    return loader.loadOne();
  }

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
