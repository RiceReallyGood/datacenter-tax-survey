#!/bin/bash
LO=$HOME/.local/opt/lo/squashfs-root/AppRun
mkdir -p $HOME/.local/opt/lo/home
cd /home/fanzhenhao/RPC_PAPERS/ppt
rm -rf render && mkdir -p render
HOME=$HOME/.local/opt/lo/home $LO --headless --norestore --convert-to pdf --outdir $PWD/render $PWD/AI_Datacenter_Tax_Kunpeng.pptx >/dev/null 2>&1
pdftoppm -jpeg -r 80 render/AI_Datacenter_Tax_Kunpeng.pdf render/slide
ls render/*.jpg | wc -l
