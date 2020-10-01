import {GraphQLResolveInfo} from 'graphql';
import {FieldsByTypeName, parseResolveInfo, ResolveTree} from 'graphql-parse-resolve-info';
import {GraphQLEntityFields, GraphQLFieldArgs} from "../types";

export class GraphQLInfoParser {
  public parseResolveInfoModels(info: GraphQLResolveInfo, fieldName?: string): GraphQLEntityFields {
    let data: ResolveTree = <ResolveTree> parseResolveInfo(info);
    if (data != null && data.fieldsByTypeName != null)
      return this.recursiveInfoParser(data, true, fieldName?.split('.'));

    return {};
  }

  private recursiveInfoParser(data: ResolveTree, root: boolean, fieldNames?: string[]): GraphQLEntityFields {
    let result: GraphQLEntityFields = {};
    // Gets definition for all models present in the tree
    let models: FieldsByTypeName = data.fieldsByTypeName;

    let modelsKeys = Object.keys(models);
    // There is no data to load
    if (modelsKeys.length === 0) return {};

    let path: string | undefined;
    if (fieldNames && fieldNames.length > 0) {
      path = fieldNames.shift()!;

      // If this is the first step (we are processing the root of the tree) then
      // we should use the path value to discriminate a union type.
      // We need to check if this is the first call to the function
      // because, if there is only one returning field it is not
      // necessary to check the path
      if (root && modelsKeys.length > 1) {
        let subpath = fieldNames.shift();
        if (!subpath)
          throw new Error('Invalid path. Missing subpath');

        return this.recursiveInfoParser(models[path][subpath], false, fieldNames);
      }
    }

    for (let modelName of modelsKeys) {
      let fieldKeys = Object.keys(models[modelName]);

      if (path) {
        result = this.recursiveInfoParser(models[modelName][path], false, fieldNames);
      } else {
        // We need to iterate for each field of each model present in the tree
        for (let fieldName of fieldKeys) {
          let field = models[modelName][fieldName];
          let args: GraphQLFieldArgs | undefined;

          if (field.args && Object.keys(field.args).length > 0) {
            args = {};

            for (let argName of Object.keys(field.args)) {
              args[argName] = {
                name: argName,
                value: field.args[argName]
              }
            }
          }

          result[fieldName] = {
            children: {},
            arguments: args
          };

          if (Object.keys(field).length > 0) {
            result[fieldName].children = this.recursiveInfoParser(field, false, fieldNames);
          }
        }
      }
    }

    return result;
  }
}

