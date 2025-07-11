import { Construct } from 'constructs';
import {
  EndpointType,
  LambdaIntegration,
  RestApi,
  SecurityPolicy,
} from 'aws-cdk-lib/aws-apigateway';
import { CnameRecord } from 'aws-cdk-lib/aws-route53';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { ACM } from '../ACM';
import { Route53 } from '../Route53';

import config from '../../../../config.json';
import { HealthCheckLambda } from '../Lambda/healthcheck';
import { DynamoPost } from '../Lambda/post';
import { DynamoGet } from '../Lambda/get';

interface Props {
  acm: ACM;
  route53: Route53;
  dynamoTable: Table;
}

export class ApiGateway extends Construct {
  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const { acm, route53, dynamoTable } = props;

    const backEndSubDomain =
      process.env.NODE_ENV === 'Production'
        ? config.backend_subdomain
        : config.backend_dev_subdomain;

    const restApi = new RestApi(this, 'chapter-8-rest-api', {
      restApiName: `chapter-8-rest-api-${process.env.NODE_ENV || ''}`,
      description: 'serverless api using lambda functions',
      domainName: {
        certificate: acm.certificate,
        domainName: `${backEndSubDomain}.${config.domain_name}`,
        endpointType: EndpointType.REGIONAL,
        securityPolicy: SecurityPolicy.TLS_1_2,
      },
      deployOptions: {
        stageName: process.env.NODE_ENV === 'Production' ? 'prod' : 'dev',
      },
    });

    // Lambdas:
    const healthCheckLambda = new HealthCheckLambda(
      this,
      'health-check-lambda-api-endpoint',
      {},
    );

    const dynamoPost = new DynamoPost(this, 'dynamo-post-lambda', {
      dynamoTable,
    });

    const dynamoGet = new DynamoGet(this, 'dynamo-get-lambda', {
      dynamoTable,
    });

    // Integrations:
    const healthCheckLambdaIntegration = new LambdaIntegration(
      healthCheckLambda.func,
    );

    const dynamoPostIntegration = new LambdaIntegration(dynamoPost.func);

    const dynamoGetIntegration = new LambdaIntegration(dynamoGet.func);

    // Resources (Path)
    const healthcheck = restApi.root.addResource('healthcheck');
    const rootResource = restApi.root;

    // Methods
    healthcheck.addMethod('GET', healthCheckLambdaIntegration);
    healthcheck.addCorsPreflight({
      allowOrigins: ['*'],
      allowHeaders: ['*'],
      allowMethods: ['*'],
      statusCode: 204,
    });

    rootResource.addMethod('POST', dynamoPostIntegration);
    rootResource.addMethod('GET', dynamoGetIntegration);
    rootResource.addCorsPreflight({
      allowOrigins: ['*'],
      allowHeaders: ['*'],
      allowMethods: ['*'],
      statusCode: 204,
    });

    // ARecord:
    if(restApi.domainName){
      new CnameRecord(scope, 'BackendAliasRecord', {
        zone: props.route53.hosted_zone,
        recordName: `${backEndSubDomain}`,
        domainName: restApi.domainName.domainNameAliasDomainName,
      });
    }
  }
}
