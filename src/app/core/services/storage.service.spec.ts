import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    window.localStorage.clear();
    service = TestBed.inject(StorageService);
  });

  it('returns null for a missing key', () => {
    expect(service.read('missing')).toBeNull();
  });

  it('round-trips a value through JSON serialization', () => {
    expect(service.write('data', { a: 1, b: ['x'] })).toBe(true);
    expect(service.read<{ a: number; b: string[] }>('data')).toEqual({ a: 1, b: ['x'] });
  });

  it('returns null and does not throw on corrupted payloads', () => {
    window.localStorage.setItem('contacts-erm:data', 'not json{');
    expect(service.read('data')).toBeNull();
  });

  it('removes a stored key', () => {
    service.write('gone', 42);
    service.remove('gone');
    expect(service.read('gone')).toBeNull();
  });

  it('namespaces keys under contacts-erm', () => {
    service.write('ns-test', 1);
    expect(window.localStorage.getItem('contacts-erm:ns-test')).toBe('1');
  });

  it('clears only its own namespace on a schema reset', () => {
    service.write('aaa', 1);
    service.write('bbb', 2);
    window.localStorage.setItem('other-app:key', 'keep-me');
    service.clearNamespace();
    expect(service.read('aaa')).toBeNull();
    expect(service.read('bbb')).toBeNull();
    expect(window.localStorage.getItem('other-app:key')).toBe('keep-me');
  });

  it('counts writes for diagnostics', () => {
    const before = service.writes;
    service.write('counter', 1);
    expect(service.writes).toBe(before + 1);
  });
});
