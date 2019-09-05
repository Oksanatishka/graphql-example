import gql from 'graphql-tag';
import express from 'express';
import { ApolloServer, makeExecutableSchema } from 'apollo-server-express';

import { GraphQLDate, GraphQLDateTime, GraphQLTime } from 'graphql-iso-date';
import { allow, rule, shield } from 'graphql-shield'; // for middleware
import { applyMiddleware } from 'graphql-middleware';

// middleware
const isAuthorized = rule()((obj, args, context, info) => {
    console.log('isAuthorized', context.authUser);
    // return false;
    return context.authUser && true;
});

export const permissions = {
    Query: {
        // '*': isAuthorized,
        sayHello: isAuthorized
    },

    Mutation: {
        '*': isAuthorized,
        sayHello: allow
    }
};

const port = process.env.PORT || 8080;

// Define APIs using GraphQL SDL
const typeDefs = gql`
    scalar Date
    scalar Time
    scalar DateTime

    type Query {
        sayHello(name: String!): String!
    }

    type Mutation {
        sayHello(name: String!): String!
    }
`;

// Define resolvers map for API definitions in SDL
const resolvers = {
    Date: GraphQLDate,
    Time: GraphQLTime,
    DateTime: GraphQLDateTime,

    Query: {
        sayHello: (obj, args, context, info) => {
            console.log(context);
            return `Hello ${args.name}!`;
        }
    },

    Mutation: {
        sayHello: (obj, args, context, info) => {
            return `Hello ${args.name}!`;
        }
    }
};

// Configure express
const app = express();

// Build GraphQL schema based on SDL definitions and resolvers maps
const schema = makeExecutableSchema({ typeDefs, resolvers });

const schemaWithMiddleware = applyMiddleware(
    schema,
    shield(permissions, { allowExternalErrors: true })
);

// Build Apollo server
// const apolloServer = new ApolloServer({
//     schema,
//     // Authentication and Authorization
//     context: ({ req, res }) => {
//         const context = {};

//         // Verify jwt token
//         const parts = req.headers.authorization ? req.headers.authorization.split(' ') : [''];
//         const token =
//             parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : undefined;
//         context.authUser = token ? verify(token) : undefined;

//         return context;
//     }
// });
const apolloServer = new ApolloServer({
    schema: schemaWithMiddleware,
    context: ({ req, res }) => {
        const context = {};

        // Verify jwt token
        const parts = req.headers.authorization ? req.headers.authorization.split(' ') : [''];
        const token =
            parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : undefined;
        context.authUser = token ? token : undefined;

        return context;
    }
});
apolloServer.applyMiddleware({ app });

// Run server
app.listen({ port }, () => {
    console.log(`🚀Server ready at http://localhost:${port}${apolloServer.graphqlPath}`);
});
