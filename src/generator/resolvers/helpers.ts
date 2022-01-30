import { OptionalKind, MethodDeclarationStructure, Writers } from "ts-morph";

import { DmmfDocument } from "../dmmf/dmmf-document";
import { DMMF } from "../dmmf/types";

export function generateCrudResolverClassMethodDeclaration(
  action: DMMF.Action,
  mapping: DMMF.ModelMapping,
  dmmfDocument: DmmfDocument,
): OptionalKind<MethodDeclarationStructure> {
  return {
    name: action.name,
    isAsync: true,
    returnType: `Promise<${action.returnTSType}>`,
    decorators: [
      {
        name: `TypeGraphQL.${action.operation}`,
        arguments: [
          `_returns => ${
            action.kind === DMMF.ModelAction.update
              ? "AffectedRowsOutput"
              : action.typeGraphQLType
          }`,
          Writers.object({
            nullable: `${!action.method.isRequired}`,
          }),
        ],
      },
      {
        name: `CustomArgs`,
        arguments: [`"${action.kind}"`],
      },
    ],
    parameters: [
      {
        name: "ctx",
        // TODO: import custom `ContextType`
        type: "any",
        decorators: [{ name: "TypeGraphQL.Ctx", arguments: [] }],
      },
      {
        name: "info",
        type: "GraphQLResolveInfo",
        decorators: [{ name: "TypeGraphQL.Info", arguments: [] }],
      },
      ...(!action.argsTypeName
        ? []
        : [
            {
              name: "args",
              type: action.argsTypeName,
              decorators: [{ name: "TypeGraphQL.Args", arguments: [] }],
            },
          ]),
    ],
    statements:
      action.kind === DMMF.ModelAction.aggregate
        ? [
            /* ts */ ` return getPrismaFromContext(ctx).${mapping.collectionName}.${action.kind}({
              ...args,
              ...transformFields(graphqlFields(info as any)),
            });`,
          ]
        : action.kind === DMMF.ModelAction.groupBy
        ? [
            /* ts */ ` const { _count, _avg, _sum, _min, _max } = transformFields(
              graphqlFields(info as any)
            );`,
            /* ts */ ` return getPrismaFromContext(ctx).${mapping.collectionName}.${action.kind}({
              ...args,
              ...Object.fromEntries(
                Object.entries({ _count, _avg, _sum, _min, _max }).filter(([_, v]) => v != null)
              ),
            });`,
          ]
        : action.kind === DMMF.ModelAction.update
        ? [
            /* ts */ ` const { _count } = transformFields(
              graphqlFields(info as any)
              );
              return getPrismaFromContext(ctx).${mapping.collectionName}.updateMany({
              ...args,
              ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
            });`,
          ]
        : action.kind === DMMF.ModelAction.findUnique
        ? [
            /* ts */ ` const { _count } = transformFields(
              graphqlFields(info as any)
              );
              return getPrismaFromContext(ctx).${mapping.collectionName}.findFirst({
              ...args,
              ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
            });`,
          ]
        : action.kind === DMMF.ModelAction.delete
        ? [
            /* ts */ `const { _count } = transformFields(
                    graphqlFields(info as any)
                    );
                    return getPrismaFromContext(ctx).${mapping.collectionName}.deleteMany({
                    ...args,
                    ...transformFields(graphqlFields(info as any)),
                  });`,
          ]
        : [
            /* ts */ ` const { _count } = transformFields(
                      graphqlFields(info as any)
                    );
                    return getPrismaFromContext(ctx).${mapping.collectionName}.${action.kind}({
                      ...args,
                      ...(_count && transformCountFieldIntoSelectRelationsCount(_count)),
                    });`,
          ],
  };
}
