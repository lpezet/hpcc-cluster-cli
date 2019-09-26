
# (HPCC) Cluster Manager

This guide provides help using and dealing with HPCC Clusters, from infrastructure (AWS) to actual cluster software (HPCC).

## Getting Started

### In A Micro-Nutshell

	$ echo "Create cluster directory"
	$ mkdir my-cluster
	$ echo "Change to cluster directory"
	$ cd my-cluster
	$ echo "Create base cluster configuration"
	$ hpcc-cluster init
	$ echo "Edit cluster configuration"
	$ vi cluster.config
	$ echo "Create cluster"
	$ hpcc-cluster up
	$ echo "Get cluster status"
	$ hpcc-cluster status
	$ echo "Start HPCC Config Manager"
	$ hpcc-cluster configmgr
	$ echo "Stop HPCC Config Manager"
	$ hpcc-cluster configmgr
	$ echo "Distribute configuration file to all nodes"
	$ hpcc-cluster hpcc-init update
	$ echo "Start HPCC cluster..."
	$ hpcc-cluster hpcc-init start
	
	
	
### In A Nutshell

1. Create directory to host your cluster files & initialize cluster configuration
2. Edit cluster configuration
3. Test cluster configuration
4. Finalize cluster configuration
5. Start cluster
6. Configure cluster (HPCC Config Manager)
7. Start HPCC cluster
8. **Preflight & Certification**
9. Have a beer!


### A Bigger Nutshell

First, create a folder to host your new cluster configuration, along with logs and such.

	$ mkdir my-cluster
	$ cd my-cluster
		
Now initialize cluster configuration.

	$ hpcc-cluster init

Edit `my.config` and `cluster.config` files. The most important parts to set are:

* **AWS.Username**: AWS username. Run `aws iam get-user` to get your username.
* **AWS.Profile**: This is the profile configured with `aws --configure --profile abc`.
* **AWS.Region**
* **Email**
* **Vpc.CidrBlock**
* **Vpc.SubnetId**
* **Vpc.SecurityGroupId**
* **DryRun**: leave this to "true" at first.

Everything else is important but those need your attention at first because 1) you don't want to create a cluster in the wrong Vpc/Subnet/Security Group and 2) can't work properly if AWS not configured properly. 
Check the comments in the `cluster.config` file for more details on other parameters.
Now test your config:

	$ hpcc-cluster up
	
Set `DryRun` to false and finalize your config if need be. Then start your cluster:

	$ hpcc-cluster up
	
Most commands now will need (for now) the IP of the Master node to connect to. To get it, and see how everything is going, run the following:

	$ hpcc-cluster status
	
You will see the `Public IP address` of the Master node printed out.
It will take time for the full setup to run but everything should be up within 2-5 minutes.
Start Config Manager to setup HPCC Cluster:

	$ hpcc-cluster configmgr

If all works, a browser window will open at the configuration manager url (ending with 8015).
If it doesn't open, copy paste the url from the console or enter the following command:

	$ open ...config manager url...
	
Setup is relatively straightforward:

* Click on **Advanced Wizard** and specify `environment.xml`
* You should get a dialog saying it will override an existing file. Click OK.
* Specify IP addresses (e.g. 192.168.0.10-12 if you have 3 nodes for example). Click Next.
* Switch to **Advanced View** to configure more features
  * Add **Htpasswd Security Plugin** (right click on "Software --> New Component --> *htpasswdsecmgr*)
  * Set the *htpasswdFile* to **/etc/HPCCSystems/.htpasswd**
  * Specify SSL Certificate password in HTTPS (Esp)
  * Use **https** and **Security Manager Plugin** in **Esp Bindings** for both entries
  * In the **Authentication** tab, set *method* to **secmgrPlugin**
  
When done, you can stop Config Manager:

	$ hpcc-cluster configmgr
	
Propagate changes to the whole cluster:

	$ hpcc-cluster hpcc-init update
	
This `update` command will 1) stop the cluster 2) copy over the new file to /etc/HPCCSystems/environment.xml and 3) push the file to all nodes in cluster.
Here's how to do it manually if you prefer:

	$ hpcc-cluster ssh
	master$ sudo -u hpcc cp /etc/HPCCSystems/source/environment.xml /etc/HPCCSystems/environment.xml
	master$ sudo /opt/HPCCSystems/sbin/hpcc-push -x -s /etc/HPCCSystems/environment.xml -t /etc/HPCCSystems/environment.xml
	master$ exit


Now start HPCC cluster:

	$ hpcc-cluster hpcc-init start
				
To check status of HPCC cluster:

	$ hpcc-cluster hpcc-init status
				
The next best thing to do here is to run **Preflight and Certification** to make sure your cluster is all working properly before diving into long-running queries and facing problems later on (might have to rebuild entire cluster).
Check the following site to get the Preflight and Certification documentation.

(https://hpccsystems.com/download/documentation/installation-and-administration/hpcc-preflight-and-certification)

## Commands

Some commands support a `[target]` parameter. This parameter takes either the form of an IP Address (`ip`) or a *node alias*.
Nodes can be referred to using friendly aliases like so:

- @master
- @support000
- @slave000

For example, to `shh` into the Master node:

	$ hpcc-cluster ssh @master
	
The `@master` argument can be omitted here, as it is the default.
To ssh into the slave node 003:

	$ hpcc-cluster ssh @slave003


### init

Basically creates `cluster.config` with some sample values in it. 
NB: `DryRun` is set to true by default to prevent any catastrophe.
Usage:

	hpcc-cluster init [-f]
	
Use `-f` to overwrite the current `cluster.config` file.
	
### status

Provides status on infrastructure (nodes).
Usage:
	
	hpcc-cluster status
	
### up/create

Create actual AWS CloudFormation Stack with all the nodes for your cluster.
Usage:

	hpcc-cluster up
	
### halt/stop

Basically stops every EC2 instance in your stack.
Usage:

	hpcc-cluster halt
	
### resume/start

Basically starts every EC2 instance in your stack.
Usage:

	hpcc-cluster resume

### hpcc-init

Simple access to `hpcc-run.sh -a hpcc-init` to execute *hpcc-init* command on the whole cluster.

Usage:

	hpcc-cluster hpcc-init start|stop|stopAll|status|update [target]

NB: `stopAll` is provided here to stop `dafilesrv` component as well.

Also `update` will stop the cluster and update the `environment.xml` file from the Master's `/etc/HPCCSystems/Source/` folder (where files are saved when using HPCC Config Manager UI.
Target is optional (default to `@master`) and take either an `ip` or a `node_alias` alias (e.g. @master, @slave000, @support000, etc.).

### ssh

Simply ssh into a node.
Usage:

	hpcc-cluster ssh [target]
	
Target is optional (default to `@master`) and take either an `ip` or a `node_alias` alias (e.g. @master, @slave000, @support000, etc.).

### configmgr

Starts/stops HPCC Config Manager. This allows you to create your `environment.xml` configuration for your HPCC cluster.
Usage:
	
	hpcc-cluster configmgr [target]
	
Target is optional (default to `@master`) and take either an `ip` or a `node_alias` alias (e.g. @master, @slave000, @support000, etc.).

### run

Runs command on specific cluster instances.
Usage:

	hpcc-cluster run <target> <cmd>
	
Example:

	hpcc-cluster run slave "iostat"
	hpcc-cluster run slave "sudo resize2fs /dev/xvdf"


### eclwatch

Open ECL Watch page in browser.

Usage:
	
	hpcc-cluster eclwatch

## Security: hpcc-cluster cli

In order to be able to boot up HPCC clusters, you will need to use an AWS profile (or default) with certain privileges (booting up EC2 instance is definitely one).

Here are the IAM Policies you'll need to create and assign to the user specified in *AWS.Profile* in your `my.config` file.

TODO

## Security: IAM Role


When booting up EC2 instances (nodes), scripts require certain access to accomplish their task. For example, basic functionality will take case of `Volumes` for all nodes, formatting, mounting, and potentially encrypting EBS volumes. This may require access to certain AWS resources (e.g. AWS SSM for encryption).

Here are the IAM Policies you'll need to create for the IAM Role you defined in your `cluster.config` file.



### IAM Get User

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "GetUserAction",
            "Effect": "Allow",
            "Action": [
                "iam:GetUser"
            ],
            "Resource": "*"
        }
    ]
}
```

### S3 Permissions

This is to allow the instance to list templates and other files uploaded by the `hpcc-cluster` cli to S3.

```json
{
    "Statement": [
        {
            "Sid": "AllowGroupToSeeBucketListAndAlsoAllowGetBucketLocationRequiredForListBucket",
            "Action": [
                "s3:ListAllMyBuckets",
                "s3:GetBucketLocation"
            ],
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::my-hpcc-clusters"
            ]
        },
        {
            "Sid": "AllowRootLevelListingOfBucket",
            "Action": [
                "s3:ListBucket"
            ],
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::my-hpcc-clusters"
            ]
        },
        {
            "Sid": "GetObjectsForHPCCClusters",
            "Action": [
                "s3:GetObject"
            ],
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::my-hpcc-clusters/*"
            ]
        }
    ]
}
```

### SSM Read Parameter

This is only necessary when using encrypted ephemeral and/or RAID devices.
Before cluster gets created, `hpcc-cluster` cli will put a password in AWS SSM, to be used for encryption of such volumes.
When instance boots up, it will retreive the password from AWS SSM to decrypt (and encrypt) it.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameters",
                "ssm:GetParameter"
            ],
            "Resource": "arn:aws:ssm:us-east-1:AWS_ACCOUNT_ID:parameter/hpcc-clusters/*"
        }
    ]
}
```


#### CloudWatch Logs
If you decide to install CloudWatch Logs (), you'll need a policy similar to the following:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "Stmt1504927370000",
            "Effect": "Allow",
            "Action": [
                "logs:*"
            ],
            "Resource": [
                "arn:aws:logs:AWS_REGION:AWS_ACCOUNT_ID:log-group:hpcc-*:*"
            ]
        }
    ]
}
```


