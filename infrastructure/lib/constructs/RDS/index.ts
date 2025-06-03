import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { CfnOutput, Duration, RemovalPolicy, Token } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';

import { CDKResourceInitializer } from './custom';

interface Props {
  vpc: ec2.Vpc;
}

export class RDS extends Construct {
  public readonly instance: rds.DatabaseInstance;

  public readonly credentials: rds.DatabaseSecret;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const instance_id = `my-sql-instance-${process.env.NODE_ENV}`;
    const credentials_secret_name = `chapter-5/rds/${instance_id}`;

    this.credentials = new rds.DatabaseSecret(
      scope,
      `MySQLCredentials-${process.env.NODE_ENV || ''}`,
      {
        secretName: credentials_secret_name,
        username: 'admin',
      },
    );

    this.instance = new rds.DatabaseInstance(scope, 'MySQL-RDS-Instance', {
      credentials: rds.Credentials.fromSecret(this.credentials),
      databaseName: 'todolist',
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0,
      }),
      instanceIdentifier: instance_id,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.M7G,
        ec2.InstanceSize.LARGE,
      ),
      port: 3306,
      publiclyAccessible: true,
      vpc: props.vpc,
      vpcSubnets: {
        onePerAz: true,
        subnetType: ec2.SubnetType.PUBLIC,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    const initializer = new CDKResourceInitializer(
      scope,
      `MyRdsInit-${process.env.NODE_ENV || ''}`,
      {
        config: {
          credentials_secret_name,
        },
        function_log_retention: RetentionDays.FIVE_MONTHS,
        function_code: DockerImageCode.fromImageAsset(`${__dirname}/init`, {}),
        function_timeout: Duration.minutes(2),
        function_security_groups: [],
        vpc: props.vpc,
        subnets_selection: props.vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        }),
      },
    );

    initializer.custom_resource.node.addDependency(this.instance);

    this.credentials.grantRead(initializer.function);

    this.instance.connections.allowFrom(
      initializer.function,
      ec2.Port.tcp(3306),
    );

    /* ----------
     * Returns the initializer function response,
     * to check if the SQL was successful or not
     * ---------- */
    new CfnOutput(scope, `RdsInitFnResponse-${process.env.NODE_ENV || ''}`, {
      value: Token.asString(initializer.response),
    });
  }
}
