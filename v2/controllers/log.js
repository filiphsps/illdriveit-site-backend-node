function logging (msg, lvl = 0) {
    Level = '[';
    switch(lvl) {
        case 1: //- Warning -
            Level += 'WARNING]: ';
            break;
        case 2: //- Error -
            Level += 'ERROR]: ';
            break;
        case 3: //- Fatal -
            Level += 'FATAL]: ';
            break;
        case 0: //- Info -
        default:
            Level += 'INFO]: ';
            break;
    }

    console.log(Level + msg);
}

module.exports.log = logging;