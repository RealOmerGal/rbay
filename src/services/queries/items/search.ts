import { itemsIndexKey } from "$services/keys";
import { client } from "$services/redis";
import { deserialize } from "./deserialize";

export const searchItems = async (term: string, size: number = 5) => {
    const cleaned = term
        .replaceAll(/[^a-zA-Z0-9]/g, '')
        .trim()
        .split(' ')
        .map((word) => word ? `%${word}%` : '')
        .join(' ')

    // Look at cleaned and make sure its valid
    if (cleaned === '') return []; //Invalid

    //Give the name field heavier weight
    const query = `(@name:(${cleaned}) => {$weight:5.0}) | (@description:(${cleaned}))`;
    // Use the client to do a actual search
    const results = await client.ft.search(
        itemsIndexKey(),
        query, {
        LIMIT: {
            from: 0,
            size
        }
    }
    )
    console.log(results);
    // Deseraelize and return the result
    return results.documents.map(({ id, value }) => deserialize(id, value as any))
    // return deserialize(results);
};
