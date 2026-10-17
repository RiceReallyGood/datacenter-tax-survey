#!/bin/bash
LO=$HOME/.local/opt/lo/squashfs-root/AppRun
mkdir -p $HOME/.local/opt/lo/home
cd /home/fanzhenhao/RPC_PAPERS/ppt
rm -rf render_rpc3 && mkdir -p render_rpc3
HOME=$HOME/.local/opt/lo/home $LO --headless --norestore --convert-to pdf --outdir $PWD/render_rpc3 $PWD/RPC_Datacenter_Tax_Survey_v3.pptx >/dev/null 2>&1
pdftoppm -jpeg -r 80 render_rpc3/RPC_Datacenter_Tax_Survey_v3.pdf render_rpc3/slide
ls render_rpc3/*.jpg | wc -l
