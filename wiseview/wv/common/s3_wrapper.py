import boto3


bucket = None


def get_bucket(name="amnh-citsci-private",region="us-west-2"):
    s3 = boto3.resource("s3",region_name=region)
    return s3.Bucket(name)


def ensure_bucket():
    """Create the private S3 bucket handle on first use.

    Importing boto3 and creating a resource at import time required AWS
    credentials just to start the Flask app. Keep it lazy so local modes work
    without credentials.
    """
    global bucket
    if bucket is None:
        bucket = get_bucket()
    return bucket


def __init():
    global bucket
    bucket = get_bucket()
