include "circomlib/circuits/comparators.circom";

template WinnerTally(n) {
    signal input votes[n];
    signal output winnerBit;

    signal sum[n];

    for (var i = 0; i < n; i++) {
        votes[i] * (1 - votes[i]) === 0;
        if (i == 0) {
            sum[0] <== votes[0];
        } else {
            sum[i] <== sum[i - 1] + votes[i];
        }
    }

    var half = 2;  // 🧠 Safe constant

    component lt = LessThan(4);    // 📊 0–15 range is fine
    lt.in[0] <== half;
    lt.in[1] <== sum[n - 1];

    winnerBit <== lt.out;

}

component main = WinnerTally(5);
