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
});
