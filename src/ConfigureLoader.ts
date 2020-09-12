import "reflect-metadata";
import {
  FieldConfigurationPredicate,
  Hash,
  LoaderFieldConfiguration,
  Selection
} from "./types";

/**
 * Internal keys for mapping entity metadata
 * @hidden
 */
const keys = {
  IGNORE_FIELD: Symbol("gqlLoader:ignoreField"),
  REQUIRED_FIELD: Symbol("gqlLoader:requiredField")
};

/**
 * Default args
 * @hidden
 */
const defaultLoaderFieldConfiguration: LoaderFieldConfiguration = {
  ignore: false,
  required: false
};

/**
 * An experimental decorator that can be used
 * to annotate fields or relations in your TypeORM entities
 * and customize the loader resolution logic.
 *
 * The decorator implementation is still being developed
 * and the API may change in the future prior to a 2.0 release.
 *
 * @example
 * ```typescript
 * @Entity()
 * class Author extends BaseEntity {
 *
 *   // This relation will never be fetched by the dataloader
 *   @ConfigureLoader({ignore: true})
 *   @OneToMany()
 *   books: [Book]
 *
 *   // This relation will always be fetched by the dataloader
 *   @ConfigureLoader({required: true})
 *   @OneToOne()
 *   user: User
 * }
 * ```
 *
 * @param options
 */
export const ConfigureLoader = (
  options: LoaderFieldConfiguration = defaultLoaderFieldConfiguration
) => {
  const { required, ignore } = {
    ...defaultLoaderFieldConfiguration,
    ...options
  };

  return (target: any, propertyKey: string) => {
    const ignoreSettings: Map<
      string,
      boolean | FieldConfigurationPredicate | undefined
    > = Reflect.getMetadata(keys.IGNORE_FIELD, target.constructor) ?? new Map();
    ignoreSettings.set(propertyKey, ignore);
    Reflect.defineMetadata(
      keys.IGNORE_FIELD,
      ignoreSettings,
      target.constructor
    );

    const requiredSettings: Map<
      string,
      boolean | FieldConfigurationPredicate | undefined
    > =
      Reflect.getMetadata(keys.REQUIRED_FIELD, target.constructor) ?? new Map();
    requiredSettings.set(propertyKey, required);
    Reflect.defineMetadata(
      keys.REQUIRED_FIELD,
      requiredSettings,
      target.constructor
    );
  };
};

/**
 * Fetch the required fields from entity metadata
 * @hidden
 * @param target
 */
export const getLoaderRequiredFields = (
  target: any
): Map<string, boolean | FieldConfigurationPredicate | undefined> => {
  return Reflect.getMetadata(keys.REQUIRED_FIELD, target) ?? new Map();
};

/**
 * Fetch the ignored fields from entity metadata
 * @hidden
 * @param target
 */
export const getLoaderIgnoredFields = (
  target: any
): Map<string, boolean | FieldConfigurationPredicate | undefined> => {
  return Reflect.getMetadata(keys.IGNORE_FIELD, target) ?? new Map();
};

export const resolvePredicate = (
  predicate: boolean | FieldConfigurationPredicate | undefined,
  context: any,
  selection: Hash<Selection> | undefined
): boolean | undefined =>
  typeof predicate === "function"
    ? predicate(context, Object.keys(selection ?? {}), selection ?? {})
    : predicate;
