# serverless


This serverless repository utilizes an AWS Lambda function triggered by SNS notifications. The Lambda function performs the following tasks:

1. **Download Release:** Upon SNS notification, the Lambda function downloads the latest release from the specified GitHub repository.

2. **Store in GCS:** The downloaded release is stored in a designated Google Cloud Storage (GCS) bucket for efficient and scalable cloud storage.

3. **Email Notification:** Users are notified of the download status via email. The Lambda function sends a notification email detailing the success or failure of the release download.

4. **Email Tracking:** The Lambda function logs the sent emails in DynamoDB, providing a traceable record of communication for auditing and tracking purposes.

## Configuration
- Set up AWS SNS to trigger the Lambda function on GitHub release notifications.
- Configure access between Lambda and the designated GCS bucket for storing releases.
- Ensure proper IAM roles for Lambda to interact with DynamoDB for email tracking.

## Usage
1. Clone this repository.
2. Deploy the Lambda function using your preferred serverless framework.
3. Configure environment variables with GitHub credentials, GCS details, and email settings.
4. Monitor DynamoDB for email tracking and ensure proper logging.

