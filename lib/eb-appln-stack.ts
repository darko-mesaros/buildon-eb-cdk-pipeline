import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3assets from 'aws-cdk-lib/aws-s3-assets';
import * as elasticbeanstalk from 'aws-cdk-lib/aws-elasticbeanstalk';
import * as iam from 'aws-cdk-lib/aws-iam';

export class EBApplnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // here be code
    // Upload an s3 Asset zip from directory UP
    const webAppZipArchive = new s3assets.Asset(this, 'WebAppZip',{
      // TEST OUT IF WE NEED ${__dirname}
      path: `${__dirname}/../src`,
    })

    // elasticbeanstalk
    const appName = 'MyWebApp';
    const app = new elasticbeanstalk.CfnApplication(this, 'Application',{
      applicationName: appName,
    });

    const appVersionProps = new elasticbeanstalk.CfnApplicationVersion(this, 'AppVersion',{
      applicationName: appName,
      sourceBundle: {
        s3Bucket: webAppZipArchive.s3BucketName,
        s3Key: webAppZipArchive.s3ObjectKey,
      },
    });
    // Make sure that Elastic Beanstalk app exists before creating an app version
    appVersionProps.addDependency(app);

    // Create role and instance profile
    const myRole = new iam.Role(this, `${appName}-aws-elasticbeanstalk-ec2-role`, {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    const managedPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier')
    myRole.addManagedPolicy(managedPolicy);
    myRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMRoleForInstancesQuickSetup'));

    const myProfileName = `${appName}-InstanceProfile`

    const instanceProfile = new iam.CfnInstanceProfile(this, myProfileName, {
        instanceProfileName: myProfileName,
        roles: [
            myRole.roleName
        ]
    });

    // Example of some options which can be configured
    const optionSettingProperties: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
        {
            namespace: 'aws:autoscaling:launchconfiguration',
            optionName: 'IamInstanceProfile',
            value: myProfileName,
        },
        {
            namespace: 'aws:autoscaling:asg',
            optionName: 'MinSize',
            value: '1',
        },
        {
            namespace: 'aws:autoscaling:asg',
            optionName: 'MaxSize',
            value: '1',
        },
        {
            namespace: 'aws:ec2:instances',
            optionName: 'InstanceTypes',
            value: 't2.micro',
        },
    ];
  const elbEnv = new elasticbeanstalk.CfnEnvironment(this, 'Environment',{
      environmentName: 'MyWebAppEnvironment',
      applicationName: app.applicationName || appName, // what is this || ?
      solutionStackName: '64bit Amazon Linux 2 v5.7.0 running Node.js 14',
      optionSettings: optionSettingProperties,
      versionLabel: appVersionProps.ref,
    })
  }
}
