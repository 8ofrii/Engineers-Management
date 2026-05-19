import { generateSecret, generate, verify } from 'otplib';

async function test() {
    try {
        const secret = await generateSecret(); // async?
        const token = await generate({ secret });
        
        const v = await verify({ token, secret, window: 1 });
        console.log("verified with window:", v);
    } catch(err) {
        console.error(err);
    }
}
test();
