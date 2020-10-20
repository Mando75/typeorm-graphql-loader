import { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";
import { GraphQLEntityFields, RequireOrIgnoreSettings } from "../types";
import { resolvePredicate } from "../ConfigureLoader";
import { EmbeddedMetadata } from "typeorm/metadata/EmbeddedMetadata";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

/**
 * A filter function used to extract the column metadata
 * of columns requested in the GraphQL query taking into
 * account ignored and remapped fields.
 * @param ignoredFields
 * @param graphQLFieldNames
 * @param selection
 * @param context
 */
export const requestedFieldsFilter = (
  ignoredFields: RequireOrIgnoreSettings,
  graphQLFieldNames: Map<string, string>,
  selection: GraphQLEntityFields,
  context: any
) => (column: ColumnMetadata) => {
  // Handle remapping of graphql -> typeorm field
  const fieldName =
    graphQLFieldNames.get(column.propertyName) ?? column.propertyName;

  // Ensure field is not ignored and that it is in the selection
  return (
    !resolvePredicate(
      ignoredFields.get(column.propertyName),
      context,
      selection
    ) &&
    (column.isPrimary || selection.hasOwnProperty(fieldName))
  );
};

/**
 * A filter function used to extract the embedded metadata
 * for embedded fields requested in a GraphQL query taking into
 * account ignore, and remapped fields
 * @param ignoredFields
 * @param graphQLFieldNames
 * @param selection
 * @param context
 */
export const requestedEmbeddedFieldsFilter = (
  ignoredFields: RequireOrIgnoreSettings,
  graphQLFieldNames: Map<string, string>,
  selection: GraphQLEntityFields,
  context: any
) => (embed: EmbeddedMetadata) => {
  const fieldName =
    graphQLFieldNames.get(embed.propertyName) ?? embed.propertyName;

  return (
    !resolvePredicate(
      ignoredFields.get(embed.propertyName),
      context,
      selection
    ) && selection.hasOwnProperty(fieldName)
  );
};

/**
 * A filter function used to extract the relation metadata
 * for relations requested in a GraphQL query taking into
 * account ignored, required, and remapped fields.
 * @param ignoredFields
 * @param requiredFields
 * @param graphQLFieldNames
 * @param selection
 * @param context
 */
export const requestedRelationFilter = (
  ignoredFields: RequireOrIgnoreSettings,
  requiredFields: RequireOrIgnoreSettings,
  graphQLFieldNames: Map<string, string>,
  selection: GraphQLEntityFields,
  context: any
) => (relation: RelationMetadata) => {
  const fieldName =
    graphQLFieldNames.get(relation.propertyName) ?? relation.propertyName;
  // Pass on ignored relations
  return (
    !resolvePredicate(
      ignoredFields.get(relation.propertyName),
      context,
      selection
    ) &&
    // check first to see if it was queried for
    (selection.hasOwnProperty(fieldName) ||
      // or if the field has been marked as required
      resolvePredicate(
        requiredFields.get(relation.propertyName),
        context,
        selection
      ))
  );
};
