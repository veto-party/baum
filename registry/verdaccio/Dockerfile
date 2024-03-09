FROM verdaccio/verdaccio:5.26

ARG CONFIG_PATH

COPY ./${CONFIG_PATH} /config.yaml

USER root

RUN mkdir /storage
RUN mkdir /storage/storage
RUN mkdir /storage/plugins

RUN chmod -R 777 /storage

USER verdaccio