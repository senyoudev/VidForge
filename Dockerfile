# Official AWS Lambda Node.js base image
FROM public.ecr.aws/lambda/nodejs:18

# Set the working directory inside the container
WORKDIR /var/task

COPY . .

# Install the dependencies
RUN npm install

# Run the Lambda function
CMD [ "src/handlers/videoProcessor.handler" ]