import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLResolveInfo,
  GraphQLString
} from "graphql";
import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { GraphQLDatabaseLoader } from "../../chaining";
import { builder } from "../schema";

import { Node } from "./Node";
import { User } from "./User";

@builder.input()
class PostPagination {
  @builder.field(GraphQLInt)
  offset!: number;

  @builder.field(GraphQLInt)
  limit!: number;
}

@builder.type()
class PaginatedPost {
  @builder.field(GraphQLBoolean)
  hasMore!: boolean;

  @builder.field(GraphQLInt)
  offset!: number;

  @builder.list(() => Post)
  posts!: Post[];
}

@builder.input()
class PostInput {
  @builder.field(GraphQLID)
  id!: string | number;

  @builder.field(GraphQLString)
  title!: string;

  @builder.field(GraphQLString)
  content!: string;

  @builder.field(GraphQLID)
  owner!: string | number;
}

@Entity({
  orderBy: {
    id: "ASC"
  }
})
@builder.type()
export class Post extends Node {
  @builder.nonNull()
  @builder.field(GraphQLString)
  @Column("varchar")
  title!: string;

  @builder.nonNull()
  @builder.field(GraphQLString)
  @Column("text")
  content!: string;

  @builder.nonNull()
  @builder.field(GraphQLString)
  @Column("text")
  camelizedField!: string;

  @ManyToOne(
    type => User,
    user => user.posts
  )
  @JoinColumn()
  @builder.nonNull()
  @builder.field(() => User)
  owner!: User;

  @builder.query({
    returnType: {
      type: () => Post,
      list: true,
      nonNullItems: true,
      nonNull: true
    },
    args: {
      where: {
        type: () => PostInput,
        defaultValue: {}
      }
    }
  })
  async posts(
    rootValue: any,
    args: any,
    context: { loader: GraphQLDatabaseLoader },
    info: GraphQLResolveInfo
  ) {
    return context.loader
      .loadEntity(Post)
      .where(args.where)
      .info(info)
      .loadMany();
  }

  @builder.query({
    returnType: {
      type: () => PaginatedPost,
      list: false,
      nonNull: true
    },
    args: {
      where: {
        type: () => PostInput,
        defaultValue: {}
      },
      pagination: {
        type: () => PostPagination,
        defaultValue: {}
      }
    }
  })
  async paginatedPosts(
    rootValue: any,
    args: any,
    context: { loader: GraphQLDatabaseLoader },
    info: GraphQLResolveInfo
  ) {
    return [];
    // const [posts, totalCount] = await context.loader.loadManyPaginated(
    //   Post,
    //   args.where,
    //   info,
    //   args.pagination
    // );
    // Note: this is just an example of a simple pagination system that does
    // not check if the end of the list is reached when calculating the next offset
    // It is advised that a more robust/standardized implementation is used. As
    // The actual pagination system is not part of the package yet, I do not feel like
    // a robust offset calculation is relevant to testing the actual functionality which
    // revolves around whether or not the paginated method returns the records with the correct
    // limits and offset
    // const { offset, limit } = args.pagination;
    // return {
    //   hasMore: offset + limit < totalCount,
    //   offset: offset + limit,
    //   posts
    // };
  }
}
