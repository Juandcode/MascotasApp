import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from "graphql";
import { Pet as PetModel, User as UserModel } from "./prisma/client.ts";
import { MyContext } from "../server/context.ts";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  DateTime: { input: Date; output: Date };
};

export type CreatePetInput = {
  age?: InputMaybe<Scalars["Int"]["input"]>;
  name: Scalars["String"]["input"];
  species: Scalars["String"]["input"];
  userId: Scalars["ID"]["input"];
};

export type CreateUserInput = {
  name: Scalars["String"]["input"];
};

export type Mutation = {
  __typename?: "Mutation";
  createPet: Pet;
  createUser: User;
};

export type MutationCreatePetArgs = {
  input: CreatePetInput;
};

export type MutationCreateUserArgs = {
  input: CreateUserInput;
};

export type Pet = {
  __typename?: "Pet";
  age?: Maybe<Scalars["Int"]["output"]>;
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  species: Scalars["String"]["output"];
  user?: Maybe<User>;
};

export type Query = {
  __typename?: "Query";
  pet?: Maybe<Pet>;
  pets: Array<Pet>;
  user?: Maybe<User>;
  users: Array<User>;
};

export type QueryPetArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryUserArgs = {
  id: Scalars["ID"]["input"];
};

export type User = {
  __typename?: "User";
  id: Scalars["ID"]["output"];
  name: Scalars["String"]["output"];
  pets: Array<Pet>;
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<
  TResult,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
  TResult,
  TKey extends string,
  TParent,
  TContext,
  TArgs,
> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
  TResult,
  TKey extends string,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<
  TTypes,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo,
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<
  T = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<
  TResult = Record<PropertyKey, never>,
  TParent = Record<PropertyKey, never>,
  TContext = Record<PropertyKey, never>,
  TArgs = Record<PropertyKey, never>,
> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]["output"]>;
  CreatePetInput: CreatePetInput;
  CreateUserInput: CreateUserInput;
  DateTime: ResolverTypeWrapper<Scalars["DateTime"]["output"]>;
  ID: ResolverTypeWrapper<Scalars["ID"]["output"]>;
  Int: ResolverTypeWrapper<Scalars["Int"]["output"]>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Pet: ResolverTypeWrapper<PetModel>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  String: ResolverTypeWrapper<Scalars["String"]["output"]>;
  User: ResolverTypeWrapper<UserModel>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Boolean: Scalars["Boolean"]["output"];
  CreatePetInput: CreatePetInput;
  CreateUserInput: CreateUserInput;
  DateTime: Scalars["DateTime"]["output"];
  ID: Scalars["ID"]["output"];
  Int: Scalars["Int"]["output"];
  Mutation: Record<PropertyKey, never>;
  Pet: PetModel;
  Query: Record<PropertyKey, never>;
  String: Scalars["String"]["output"];
  User: UserModel;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<
  ResolversTypes["DateTime"],
  any
> {
  name: "DateTime";
}

export type MutationResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Mutation"] = ResolversParentTypes["Mutation"],
> = ResolversObject<{
  createPet?: Resolver<
    ResolversTypes["Pet"],
    ParentType,
    ContextType,
    RequireFields<MutationCreatePetArgs, "input">
  >;
  createUser?: Resolver<
    ResolversTypes["User"],
    ParentType,
    ContextType,
    RequireFields<MutationCreateUserArgs, "input">
  >;
}>;

export type PetResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Pet"] = ResolversParentTypes["Pet"],
> = ResolversObject<{
  age?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes["DateTime"], ParentType, ContextType>;
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  species?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes["User"]>, ParentType, ContextType>;
}>;

export type QueryResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["Query"] = ResolversParentTypes["Query"],
> = ResolversObject<{
  pet?: Resolver<
    Maybe<ResolversTypes["Pet"]>,
    ParentType,
    ContextType,
    RequireFields<QueryPetArgs, "id">
  >;
  pets?: Resolver<Array<ResolversTypes["Pet"]>, ParentType, ContextType>;
  user?: Resolver<
    Maybe<ResolversTypes["User"]>,
    ParentType,
    ContextType,
    RequireFields<QueryUserArgs, "id">
  >;
  users?: Resolver<Array<ResolversTypes["User"]>, ParentType, ContextType>;
}>;

export type UserResolvers<
  ContextType = MyContext,
  ParentType extends ResolversParentTypes["User"] = ResolversParentTypes["User"],
> = ResolversObject<{
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  name?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  pets?: Resolver<Array<ResolversTypes["Pet"]>, ParentType, ContextType>;
}>;

export type Resolvers<ContextType = MyContext> = ResolversObject<{
  DateTime?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Pet?: PetResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
}>;
