// Create a service client module using ES6 syntax.
import {DynamoDBDocumentClient} from "@aws-sdk/lib-dynamodb";
// Create the DynamoDB service client module using ES6 syntax.
import {DynamoDBClient} from "@aws-sdk/client-dynamodb";
// Create an Amazon DynamoDB service client object.


export const ddbClient = new DynamoDBClient({
  region: process.env.AWS_DYNAMODB_REGION || 'eu-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});


const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

// Create the DynamoDB document client.
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions,
  unmarshallOptions,
});

export {ddbDocClient};