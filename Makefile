.PHONY: all submodule clean

all: ipxe.pxe

clean:
	rm -f *.lkrn

%.pxe %.kpxe %.lkrn: ipxe/src/Makefile embedded.ipxe
	rm -f ipxe/src/bin/$@
	cd ipxe/src && make -j4 bin/$@ EMBED=../../embedded.ipxe
	cp ipxe/src/bin/$@ .
	touch $@

ipxe/src/Makefile: .gitmodules
	git submodule init
	git submodule update
	touch $@

node_modules: package.json
	npm install
