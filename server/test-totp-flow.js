import 'dotenv/config';
import prisma from './lib/prisma.js';
import { generate } from 'otplib';
import bcrypt from 'bcryptjs';

async function run() {
    let user;
    try {
        const { enroll2FA, confirmEnroll2FA, login, login2FA } = await import('./controllers/authController.js');
        const testUserEmail = `test2fa_${Date.now()}@test.com`;
        const hashedPassword = bcrypt.hashSync('password', 10);
        user = await prisma.user.create({
            data: {
                email: testUserEmail,
                password: hashedPassword,
                name: 'Test 2FA',
                totpEnabled: false
            }
        });

        // 1. Enroll
        let res1 = null;
        await enroll2FA({ user, headers: {} }, { status: () => ({ json: (d) => res1 = d }) }, (e) => console.log(e));
        const secret = res1.data.secret;
        
        // 2. Confirm
        let code = await generate({ secret });
        let res2 = null;
        await confirmEnroll2FA({ user, body: { code }, headers: {}, connection: { remoteAddress: '127.0.0.1' } }, { status: () => ({ json: (d) => res2 = d }) }, (e) => console.log(e));
        console.log('Confirm:', res2);

        // 3. Login
        let res3 = null;
        await login({ body: { email: testUserEmail, password: 'password' }, headers: {} }, { status: () => ({ json: (d) => res3 = d }) }, (e) => console.log(e));
        console.log('Login:', res3);

        if (!res3.requires2FA) throw new Error("Expected 2FA challenge");

        const challengeToken = res3.challengeToken;
        
        // 4. Login 2FA
        let code2 = await generate({ secret });
        let res4 = null;
        await login2FA({ body: { challengeToken, code: code2 }, headers: {}, connection: { remoteAddress: '127.0.0.1' } }, { status: () => ({ json: (d) => res4 = d }) }, (e) => console.log(e));
        console.log('Login2FA:', res4);

    } catch(err) {
        console.error(err);
    } finally {
        if (user) {
            await prisma.auditLog.deleteMany({ where: { userId: user.id } });
            await prisma.user.delete({ where: { id: user.id } });
        }
    }
}
run();
