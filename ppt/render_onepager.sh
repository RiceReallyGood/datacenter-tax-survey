#!/bin/bash
LO=$HOME/.local/opt/lo/squashfs-root/AppRun
cd /home/fanzhenhao/RPC_PAPERS/ppt
rm -rf render_onepager && mkdir -p render_onepager
HOME=$HOME/.local/opt/lo/home $LO --headless --norestore --convert-to pdf --outdir $PWD/render_onepager $PWD/Agent_Workload_to_Library_Onepager.pptx >/dev/null 2>&1
pdftoppm -jpeg -r 150 render_onepager/Agent_Workload_to_Library_Onepager.pdf render_onepager/slide
ls render_onepager/*.jpg
