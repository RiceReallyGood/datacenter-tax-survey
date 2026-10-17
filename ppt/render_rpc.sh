#!/bin/bash
LO=$HOME/.local/opt/lo/squashfs-root/AppRun
mkdir -p $HOME/.local/opt/lo/home
cd /home/fanzhenhao/RPC_PAPERS/ppt
rm -rf render_rpc && mkdir -p render_rpc
HOME=$HOME/.local/opt/lo/home $LO --headless --norestore --convert-to pdf --outdir $PWD/render_rpc $PWD/RPC_Datacenter_Tax_Survey.pptx >/dev/null 2>&1
pdftoppm -jpeg -r 80 render_rpc/RPC_Datacenter_Tax_Survey.pdf render_rpc/slide
ls render_rpc/*.jpg | wc -l
