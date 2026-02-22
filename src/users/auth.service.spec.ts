import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './users.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUsersService: Partial<UsersService>;

  beforeEach(async () => {
    // create a fake copy of the users service
    const users: User[] = [];
    fakeUsersService = {
      find: (email: string) => {
        const filteredUsers = users.filter((user) => user.email === email);
        return Promise.resolve(filteredUsers);
      },
      create: (email: string, password: string) => {
        const user = { id: users.length + 1, email, password } as User;
        users.push(user);
        return Promise.resolve(user);
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUsersService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should create an instance of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('creates a new user with a salted and hashed password', async () => {
    const user = await service.signup('test@example.com', 'password');

    expect(user.password).not.toEqual('password');

    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws an error if user signs up with email that is in use', async () => {
    fakeUsersService.find = () =>
      Promise.resolve([{ id: 1, email: 'a', password: '1' } as User]);

    await expect(
      service.signup('test@example.com', 'password'),
    ).rejects.toThrow(BadRequestException);
  
  });

  it('throws if signin is called with an unused email', async () => {
    await expect(
      service.signin('unused@example.com', 'password'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws if an invalid password is provided', async () => {
    fakeUsersService.find = () =>
      Promise.resolve([
        { email: 'test@example.com', password: 'invalidpassword' } as User,
      ]);
    await expect(
      service.signin('test@example.com', 'wrongpassword'),
    ).rejects.toThrow(BadRequestException);
  });

  // it('returns a user if correct password is provided', async () => {
  //   const scrypt = promisify(_scrypt);
  //   let password = 'password';
  //   const salt = 'salt';
  //   const hash = (await scrypt(password, salt, 32)) as Buffer;

  //   fakeUsersService.find = () =>
  //     Promise.resolve([
  //       {
  //         email: 'test@example.com',
  //         password: `${salt}.${hash.toString('hex')}`,
  //       } as User,
  //     ]);

  //   const user = await service.signin('test@example.com', 'password');
  //   expect(user).toBeDefined();
  // });

  it('returns a user if correct password is provided', async () => {
    const user = await service.signup('test@example.com', 'password');
    const signedInUser = await service.signin('test@example.com', 'password');
    expect(signedInUser).toBeDefined();
  });
});
