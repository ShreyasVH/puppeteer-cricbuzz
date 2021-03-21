FROM alekzonder/puppeteer
MAINTAINER Shreyas
USER root
RUN rm -rf /etc/localtime && ln -s /usr/share/zoneinfo/Asia/Kolkata /etc/localtime
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .