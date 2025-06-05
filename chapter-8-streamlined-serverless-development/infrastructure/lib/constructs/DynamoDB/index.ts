/* ---------- External Libraries ---------- */
import { RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { v4 as uuidv4 } from 'uuid';
import AWS from 'aws-sdk';
import { uuid } from 'aws-sdk/clients/customerprofiles';

export interface SeedItem {
  id: uuid;
  todo_name: string;
  todo_description: string;
  todo_completed: boolean
}

class DynamoDBSeeder {
  private dynamoDB: AWS.DynamoDB.DocumentClient;
  private tableName: string;

  constructor(tableName: string) {
      this.tableName = tableName;
      this.dynamoDB = new AWS.DynamoDB.DocumentClient({
            region: 'us-east-1',
          });
      
  }

  async seedData(items: SeedItem[]): Promise<void> {
      const putRequests = items.map(item => ({
          PutRequest: {
              Item: item
          }
      }));

      const params = {
          RequestItems: {
              [this.tableName]: putRequests
          }
      };

      try {
          await this.dynamoDB.batchWrite(params).promise();
          console.log(`Successfully seeded data into ${this.tableName}`);
      } catch (error) {
          console.error(`Failed to seed data: ${error}`);
      }
  }

  async clearData(): Promise<void> {
      const params = {
          TableName: this.tableName
      };

      try {
          const data = await this.dynamoDB.scan(params).promise();
          const deleteRequests = data.Items?.map(item => ({
              DeleteRequest: {
                  Key: { id: item.id } // Assuming 'id' is the primary key
              }
          }));

          if (deleteRequests && deleteRequests.length > 0) {
              await this.dynamoDB.batchWrite({ RequestItems: { [this.tableName]: deleteRequests } }).promise();
              console.log(`Successfully cleared data from ${this.tableName}`);
          }
      } catch (error) {
          console.error(`Failed to clear data: ${error}`);
      }
  }
}


export class DynamoDB extends Construct {
  readonly table: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new Table(this, `Dynamo-Table-${process.env.NODE_ENV || ''}`, {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      tableName: 'todolist-production',
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const seed = new DynamoDBSeeder('todolist-production');
    seed.clearData()
      .then(() => { console.log(`Cleared existing data from ${this.table.tableName}`); })
      .catch((error) => console.error(`Error clearing data: ${error}`));
    seed.seedData(([
          {
            id: uuidv4(),
            todo_name: 'First todo',
            todo_description: "That's a todo for demonstration purposes",
            todo_completed: true,
          },
        ]));
  }
    
}
