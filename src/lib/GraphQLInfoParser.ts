import { GraphQLResolveInfo } from "graphql";
import {
  FieldsByTypeName,
  parseResolveInfo,
  ResolveTree
} from "graphql-parse-resolve-info";
import { GraphQLEntityFields } from "../types";

export class GraphQLInfoParser {
  public parseResolveInfoModels(
    info: GraphQLResolveInfo,
    fieldName?: string
  ): GraphQLEntityFields {
    const data: ResolveTree = <ResolveTree>parseResolveInfo(info);
    if (data?.fieldsByTypeName)
      return this.recursiveInfoParser(data, true, fieldName?.split("."));

    return {};
  }

  private recursiveInfoParser(
    data: ResolveTree,
    root: boolean,
    fieldNames?: string[]
  ): GraphQLEntityFields {
    let result: GraphQLEntityFields = {};
    // Gets definition for all models present in the tree
    const requestedFieldsByTypeName: FieldsByTypeName = data.fieldsByTypeName;
    const requestedFieldCount = Object.keys(requestedFieldsByTypeName).length;

    if (requestedFieldCount === 0) return {};

    const path = fieldNames?.shift();
    if (path) {
      // If this is the first step (we are processing the root of the tree) then
      // we should use the path value to discriminate a union type.
      // We need to check if this is the first call to the function
      // because, if there is only one returning field it is not
      // necessary to check the path
      if (root && requestedFieldCount > 1) {
        const subpath = fieldNames?.shift();
        if (!subpath) throw new Error("Invalid path. Missing subpath");

        return this.recursiveInfoParser(
          requestedFieldsByTypeName[path][subpath],
          false,
          fieldNames
        );
      }
    }

    Object.values(requestedFieldsByTypeName).forEach(childFields => {
      if (path) {
        result = this.recursiveInfoParser(childFields[path], false, fieldNames);
      } else {
        Object.entries(childFields).forEach(([fieldName, field]) => {
          Object.defineProperty(result, fieldName, {
            value: {
              children: Object.keys(field).length
                ? this.recursiveInfoParser(field, false, fieldNames)
                : {},
              arguments: field.args
            },
            writable: false
          });
        });
      }
    });

    return result;
  }
}
