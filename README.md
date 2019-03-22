# hpcc-cluster-cli

## TL;DR

Have an AWS account and setup an IAM user with the policy provided further below. For more details on this setup and what's needed, see AWS Setup section,
The following will install the cli:

```shell
mkdir hpcc-cluster-cli
cd hpcc-cluster-cli
git clone https://github.com/lpezet/hpcc-cluster-cli .
cd nodejs
npm install -g .
```

Now's time to create a cluster:

```shell
cd ~
mkdir -p hpcc-clusters/cluster1
cd hpcc-clusters/cluster1
hpcc-cluster init
vi my.config
vi cluster.config
```

Once configuration is set:

```shell
hpcc-cluster up
```





## Getting Started


* Create AWS Account. If you already have one, and for the paranoid like me, I suggest creating a sub-org AW Account. This way it's separate from your (precious) principal account and you don't have to fear anything (deleting wrong EC2 instance or something).
* Create a new IAM user. Let's call it *hpcc-cluster*. No need for console access (so no password), only programmatic access (Access Key and Secret Key)


## Cluster Configuration

Upon `hpcc-cluster init`, some sample configuration files are created in the current directory, `cluster.config` and `my.config`.
The configuration file `my.config` is used to store private information, especially AWS info:

- *AWS*: This section, you need to specify some AWS configuration, like profile, region, etc. NB: No sensitive information like secret keys are specified here.
- *DryRun*: whether or not to run in dry-run mode.
- *KeyPairFile*: pem file to use to `ssh` into nodes of your cluster
- *Email*: do not fret, it's only stored on your AWS resources, so internal processes can leverage that info and notify you of events.

The cluster configuration, `cluster.config`, is composed of the following high level sections:

- *Vpc*: This section needs to provide overall information on the network. The id of the subnet to boot up instances into, the security group to use and the range of IPs to use for the cluster.
- *Cluster*: Overall information about the cluster must be provided here. For example, number of slaves, number of support nodes, etc.
- *Instance*: This abstract section provides the default settings for the rest. The basic information needed here are *KeyName* (the keypair name to use for the EC2 instances), *ImageId* being the id of the image to use for the EC2 instances and the *IamRole* to attach to the EC2 instances.
- *MasterInstance*: This provides the information necessary to create the Master node of the HPCC Systems cluster. Settings provided in 
*Instance* section are inherited and can be overwritten here.
- *SupportInstance*: This provides the information necessary to create Support nodes. Settings provided in 
*Instance* section are inherited and can be overwritten here.
- *SlaveInstance*: This provides the information necessary to create Slave nodes. Settings provided in 
*Instance* section are inherited and can be overwritten here.


### AWS

### Vpc

### Cluster

### Instance, MasterInstance, SupportInstance & SlaveInstance

The *Instance* section provides the basic configuration to apply to all types of instances. Properties specified in this section can be overwritten in each specific instance section (MasterInstance, SlaveInstance, and SupportInstance).
This section, like the node-type specific ones, is composed of:

- *KeyName*:
- *ImageId*:
- *IamRole*: hpcc-cluster
- *Type*: m4.large
- *ConfigSets*:
- *Volumes*: This section provides the details of the EBS volumes to create and attach to node(s) for this type of instance. For example, Slave nodes will have bigger EBS volumes for their hpcc-data than say the Support nodes. RAID can also be specified here.
- *Raids*: This section is only necessary if any of the Volumes specified earlier need to be part of a RAID setting.

#### ConfigSets


#### Volumes

- *DeviceName*:
- *Size*:
- *Type*
- *FSType*:
- *Encrypted*:
- *Iops*:
- *Mount*:
- *MapsTo*:
- *RaidDeviceName*: (optional)

#### Raids
