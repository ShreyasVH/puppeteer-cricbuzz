FROM alekzonder/puppeteer
MAINTAINER Shreyas
WORKDIR /app
COPY . .
RUN npm install