pragma circom 2.1.8;

include "circomlib/circuits/poseidon.circom";

template Poseidon250() {
    signal input in;
    signal output out;

    signal states[251];
    states[0] <== in;

    component hashes[250];
    for (var i = 0; i < 250; i++) {
        hashes[i] = Poseidon(1);
        hashes[i].inputs[0] <== states[i];
        states[i + 1] <== hashes[i].out;
    }

    out <== states[250];
}

component main {public [in]} = Poseidon250();
