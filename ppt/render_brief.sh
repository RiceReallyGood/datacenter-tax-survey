#!/bin/bash
LO=$HOME/.local/opt/lo/squashfs-root/AppRun
cd /home/fanzhenhao/RPC_PAPERS/ppt
rm -rf render_brief && mkdir -p render_brief
HOME=$HOME/.local/opt/lo/home $LO --headless --norestore --convert-to pdf --outdir $PWD/render_brief $PWD/AI_Datacenter_Tax_Kunpeng_Brief.pptx >/dev/null 2>&1
pdftoppm -jpeg -r 110 render_brief/AI_Datacenter_Tax_Kunpeng_Brief.pdf render_brief/slide
ls render_brief/*.jpg | wc -l
