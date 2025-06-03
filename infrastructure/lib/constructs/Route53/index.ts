import { HostedZone, IHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

export class Route53 extends Construct {
  public readonly hosted_zone: IHostedZone;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    try {
      this.hosted_zone = new HostedZone(scope, 'HostedZone', {zoneName: 'superraev.com'});
    } catch (error) {
      console.error(error);
      console.log( this.hosted_zone);      
    }
    console.log( this.hosted_zone);
  }
}
