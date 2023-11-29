const AWS = require('aws-sdk');
const S3 = new AWS.S3();
const DynamoDB = new AWS.DynamoDB();
const mailgun = require('mailgun-js')({
    apiKey: '516c85648c378e36f8e48b908239f8f2-30b58138-6cbb07b9',
    domain: 'f23cloud.me',
});

const axios = require('axios');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

const bucketName = 'my-gcs-bucket'; // Replace with your GCS bucket name
const senderEmail = 'postmaster@f23cloud.me'; // Replace with your email address
const tableName = 'my-dynamodb-table'; // Replace with your DynamoDB table name


exports.handler = async (event) => {
    try {
        // Extract information from the SNS event
        const snsMessage = JSON.parse(event.Records[0].Sns.Message);
        const userId = snsMessage.userId;
        const submissionUrl = snsMessage.submissionUrl;

        // Download the release from the GitHub repository
        const githubRelease = await downloadGitHubRelease(submissionUrl);

        // Store the release in Google Cloud Storage
        await storeInGoogleCloudStorage(githubRelease);

        // Email the user about the status of the download
        await sendEmail(userId, 'Download successful');

        // Track the email in DynamoDB
        await trackEmail(userId, 'Download successful');

        return {
            statusCode: 200,
            body: JSON.stringify('Download and email sent successfully'),
        };
    } catch (error) {
        // Handle errors
        console.error('Error:', error);
        await sendEmail(userId, 'Download failed', error.message);

        return {
            statusCode: 500,
            body: JSON.stringify('Error occurred'),
        };
    }
};

async function downloadGitHubRelease(submissionUrl) {
  try {
      // Extract the GitHub repository owner, name, and release tag from the URL
      const regex = /https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/releases\/download\/([^\/]+)/;
      const match = submissionUrl.match(regex);

      if (!match || match.length < 4) {
          throw new Error('Invalid GitHub release URL');
      }

      const owner = match[1];
      const repo = match[2];
      const tag = match[3];

      // Get the release information from the GitHub API
      const releaseUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`;
      const response = await axios.get(releaseUrl);

      // Get the download URL for the release asset
      const assetUrl = response.data.assets[0].browser_download_url;

      // Download the release asset
      const releaseResponse = await axios.get(assetUrl, { responseType: 'arraybuffer' });

      // Return the downloaded release data
      return releaseResponse.data;
  } catch (error) {
      throw new Error(`Error downloading GitHub release: ${error.message}`);
  }
}

async function storeInGoogleCloudStorage(githubRelease) {
  try {
      // Generate a unique filename for the release in GCS
      const filename = `github_release_${Date.now()}.zip`;

      // Get a reference to the GCS bucket
      const bucket = storage.bucket(bucketName);

      // Create a new file in the bucket with the GitHub release data
      await bucket.file(filename).save(githubRelease);

      // Get the public URL of the stored file
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;

      // Return the public URL of the stored file
      return publicUrl;
  } catch (error) {
      throw new Error(`Error storing data in Google Cloud Storage: ${error.message}`);
  }
}

async function sendEmail(userId, subject, message) {
  try {
      const emailData = {
          from: senderEmail,
          to: userId,
          subject: subject,
          text: message,
      };

      // Send the email using Mailgun
      const result = await mailgun.messages().send(emailData);

      console.log('Email sent:', result);

      // Return the result of the email sending operation
      return result;
  } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Error sending email: ${error.message}`);
  }
}

async function trackEmail(userId, status) {
  try {
      // Create a timestamp for the current date and time
      const timestamp = new Date().toISOString();

      // Define the item to be inserted into DynamoDB
      const params = {
          TableName: tableName,
          Item: {
              UserId: { S: userId },
              Status: { S: status },
              Timestamp: { S: timestamp },
          },
      };

      // Put the item into DynamoDB
      await DynamoDB.putItem(params).promise();

      console.log('Email tracked in DynamoDB:', { userId, status, timestamp });

      // Return information about the tracked email
      return { userId, status, timestamp };
  } catch (error) {
      console.error('Error tracking email in DynamoDB:', error);
      throw new Error(`Error tracking email in DynamoDB: ${error.message}`);
  }
}















