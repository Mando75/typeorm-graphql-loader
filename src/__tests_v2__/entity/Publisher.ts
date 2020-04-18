import { BaseEntity, Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Book } from "./Book";

export class Publisher extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("varchar")
  name!: string;

  @Column("varchar")
  address!: string;

  @OneToMany(
    type => Book,
    book => book.publisher
  )
  books!: Book[];
}
