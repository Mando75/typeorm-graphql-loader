import {
  GraphQLInt,
  GraphQLResolveInfo,
  GraphQLID,
  GraphQLString
} from "graphql";
import { Entity, PrimaryColumn, Column, OneToMany } from "typeorm";
import { GraphQLDatabaseLoader } from "../../src";
import { builder } from "../schema";
import { Node } from "./Node";
import { Post } from "./Post";
import { LoaderSearchMethod } from "../../src/base";

@Entity()
@builder.type()
export class User extends Node {
  @builder.nonNull()
  @builder.field(GraphQLID)
  @PrimaryColumn()
  id!: number;

  @builder.nonNull()
  @builder.field(GraphQLString)
  @Column("varchar")
  email!: string;

  @builder.nonNull()
  @builder.field(GraphQLString)
  @Column("varchar")
  firstName!: string;

  @builder.nonNull()
  @builder.field(GraphQLString)
  @Column("varchar")
  lastName!: string;

  @builder.nonNull()
  @builder.field(GraphQLInt)
  @Column("int")
  age!: number;

  @builder.nonNull()
  @builder.nonNullItems()
  @builder.list(() => Post)
  @OneToMany(type => Post, post => post.owner)
  posts!: Post[];

  @builder.query({
    returnType: {
      type: () => User,
      list: true,
      nonNullItems: true,
      nonNull: true
    }
  })
  async users(
    rootValue: any,
    args: any,
    context: { loader: GraphQLDatabaseLoader },
    info: GraphQLResolveInfo
  ) {
    return context.loader.loadMany(User, {}, info);
  }

  @builder.query({
    args: { id: { type: GraphQLID, defaultValue: null } },
    returnType: {
      type: () => User,
      list: false,
      nonNullItems: false,
      nonNull: false
    }
  })
  async user(
    rootValue: any,
    { id }: any,
    context: { loader: GraphQLDatabaseLoader },
    info: GraphQLResolveInfo
  ) {
    return context.loader.loadOne(User, { id }, info, {
      order: { "User__posts.id": "ASC" }
    });
  }

  @builder.query({
    args: {
      search: { type: GraphQLString, defaultValue: null },
      method: { type: GraphQLInt, defaultValue: 0 }
    },
    returnType: {
      type: () => User,
      list: false,
      nonNull: false
    }
  })
  async userWithSensitiveSearch(
    rootValue: any,
    { search, method }: { search: string; method: LoaderSearchMethod },
    context: { loader: GraphQLDatabaseLoader },
    info: GraphQLResolveInfo
  ) {
    return context.loader.loadOne(User, {}, info, {
      search: {
        searchColumns: ["email", "firstName", "lastName"],
        searchText: search,
        searchMethod: method,
        caseSensitive: true
      }
    });
  }

  @builder.query({
    args: {
      search: { type: GraphQLString, defaultValue: null },
      method: { type: GraphQLInt, defaultValue: 0 }
    },
    returnType: {
      type: () => User,
      list: false,
      nonNull: false
    }
  })
  async userWithInSensitiveSearch(
    rootValue: any,
    { search, method }: { search: string; method: LoaderSearchMethod },
    context: { loader: GraphQLDatabaseLoader },
    info: GraphQLResolveInfo
  ) {
    return context.loader.loadOne(User, {}, info, {
      search: {
        searchColumns: ["email", "firstName", "lastName"],
        searchText: search,
        searchMethod: method,
        caseSensitive: false
      }
    });
  }

  @builder.query({
    args: {
      search: { type: GraphQLString, defaultValue: null },
      method: { type: GraphQLInt, defaultValue: 0 }
    },
    returnType: {
      type: () => User,
      list: false,
      nonNull: false
    }
  })
  async userWithJoinedSearch(
    rootValue: any,
    { search, method }: { search: string; method: LoaderSearchMethod },
    context: { loader: GraphQLDatabaseLoader },
    info: GraphQLResolveInfo
  ) {
    return context.loader.loadOne(User, {}, info, {
      search: {
        searchColumns: ["email", ["firstName", "lastName"]],
        searchText: search,
        searchMethod: method,
        caseSensitive: false
      }
    });
  }
}
