import { Prompt } from "fastmcp";

export default [
    {
        name: "native_token_queries",
        description: "Guidance on the format to use for queries related to the native token contract",
        load: async () => {
            return "You can use the SQL file resources to run queries for the native token contract. You must use the exact spelling of `native` for the contract filter.";
        }
    },
] as Prompt[];