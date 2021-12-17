FROM gitpod/workspace-full:latest

ARG DEBIAN_FRONTEND=noninteractive

RUN sudo apt-get -q update && sudo apt-get install -yq firefox-geckodriver
