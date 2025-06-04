import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
} from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { resolve } from 'path';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Distribution, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { CnameRecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
const uuid_1 = require("uuid");

import { Route53 } from '../Route53';
import { ACM } from '../ACM';

import config from '../../../../config.json';

interface Props {
  acm: ACM;
  route53: Route53;
}

export class S3 extends Construct {
  public readonly web_bucket: Bucket;

  public readonly web_bucket_deployment: BucketDeployment;

  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    //const unique_id = 'akemxdjqkl';

    this.web_bucket = new Bucket(
      scope,
      `WebBucket-${process.env.NODE_ENV || ''}`,
      {
        bucketName: `ch-7-web-bucket-${uuid_1.v4()}`,
        websiteIndexDocument: 'index.html',
        websiteErrorDocument: 'index.html',
        publicReadAccess: true,
        blockPublicAccess: new BlockPublicAccess({ blockPublicPolicy: false }),
        accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        enforceSSL: false,      
      },
    );

    this.web_bucket_deployment = new BucketDeployment(
      scope,
      `WebBucketDeployment-${process.env.NODE_ENV || ''}`,
      {
        sources: [
          Source.asset(
            resolve(__dirname, '..', '..', '..', '..', 'web', 'build'),
          ),
        ],
        destinationBucket: this.web_bucket,
      },
    );

    const frontEndSubDomain =
      process.env.NODE_ENV === 'Production'
        ? config.frontend_subdomain
        : config.frontend_dev_subdomain;

    this.distribution = new Distribution(
      scope,
      `Frontend-Distribution-${process.env.NODE_ENV || ''}`,
      {
        certificate: props.acm.certificate,
        domainNames: [`${frontEndSubDomain}.${config.domain_name}`],
        defaultRootObject: 'index.html',
        defaultBehavior: {
          origin: new S3Origin(this.web_bucket),
          viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      },
    );

    new CnameRecord(scope, 'FrontendAliasRecord', {
      zone: props.route53.hosted_zone,
      recordName: `${frontEndSubDomain}`,
      domainName: this.distribution.domainName,
    });

    new CfnOutput(scope, `FrontendURL-${process.env.NODE_ENV || ''}`, {
      value: this.web_bucket.bucketDomainName,
    });
  }
}
