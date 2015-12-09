FROM node:0.10.41
EXPOSE 8000
MAINTAINER Jean-Christophe Hoelt <hoelt@fovea.cc>
RUN useradd app -d /home/app
WORKDIR /home/app/code
COPY package.json /home/app/code/package.json
RUN chown -R app /home/app

USER app
RUN npm install

COPY .eslintrc .eslintignore config.js coffeelint.json newrelic.js Makefile index.js /home/app/code/
COPY tests /home/app/code/tests
COPY src /home/app/code/src

USER root
RUN chown -R app /home/app

WORKDIR /home/app/code
USER app
RUN make
CMD node_modules/.bin/forever index.js
