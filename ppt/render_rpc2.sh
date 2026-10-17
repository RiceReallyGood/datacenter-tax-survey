#!/bin/bash
LO=$HOME/.local/opt/lo/squashfs-root/AppRun
mkdir -p $HOME/.local/opt/lo/home
cd /home/fanzhenhao/RPC_PAPERS/ppt
rm -rf render_rpc2 && mkdir -p render_rpc2
HOME=$HOME/.local/opt/lo/home $LO --headless --norestore --convert-to pdf --outdir $PWD/render_rpc2 $PWD/RPC_Datacenter_Tax_Survey_v2.pptx >/dev/null 2>&1
pdftoppm -jpeg -r 80 render_rpc2/RPC_Datacenter_Tax_Survey_v2.pdf render_rpc2/slide
ls render_rpc2/*.jpg | wc -l
